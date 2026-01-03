'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  useFirestore,
  useUser,
  setDocumentNonBlocking,
  useCollection,
  useDoc,
  addDocumentNonBlocking,
} from '@/firebase';
import {
  doc,
  collection,
  query,
  where,
  writeBatch,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  HandHeart,
  Loader,
  MapPin,
  Users,
  PlusCircle,
  LogOut,
  UserPlus,
} from 'lucide-react';
import { useLocation } from '@/hooks/use-location';
import { calculateDistance } from '@/lib/utils';
import type { User, Team } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface VolunteerWithDistance extends User {
  distance?: number;
}

interface TeamWithDistance extends Team {
  distance?: number;
  leader?: User;
}

const TEAMS_RADIUS_KM = 5;

export default function VolunteerHubPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { location } = useLocation();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isCreateTeamOpen, setCreateTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');

  const userDocRef = useMemo(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc<User>(userDocRef);

  const volunteersQuery = useMemo(() => {
    if (!firestore) return null;
    // This query now correctly filters for users who are volunteers, matching the security rules.
    return query(collection(firestore, 'users'), where('isVolunteer', '==', true));
  }, [firestore]);

  const { data: volunteers, isLoading: isLoadingVolunteers } =
    useCollection<User>(volunteersQuery);

  const teamsQuery = useMemo(
    () => (firestore ? collection(firestore, 'teams') : null),
    [firestore]
  );
  const { data: allTeams, isLoading: isLoadingTeams } =
    useCollection<Team>(teamsQuery);
  
  const userTeamRef = useMemo(() => {
    if (!firestore || !userProfile?.teamId) return null;
    return doc(firestore, 'teams', userProfile.teamId);
  }, [firestore, userProfile?.teamId]);

  const { data: userTeam, isLoading: isUserTeamLoading } = useDoc<Team>(userTeamRef);
  
  const teamMembersQuery = useMemo(() => {
    if (!firestore || !userTeam?.memberIds || userTeam.memberIds.length === 0) {
      return null;
    }
    // This query is allowed because it uses the 'id' field with an 'in' operator.
    return query(
      collection(firestore, 'users'), 
      where('id', 'in', userTeam.memberIds)
    );
  }, [firestore, userTeam]);

  const { data: teamMembers, isLoading: isLoadingTeamMembers } = useCollection<User>(teamMembersQuery);


  useEffect(() => {
    setIsClient(true);
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleRegister = async () => {
    if (!user || !firestore || !location || !userDocRef) {
      toast({
        variant: 'destructive',
        title: 'Could not register',
        description:
          'You must be logged in and have location services enabled.',
      });
      return;
    }
    setIsSubmitting(true);
    const userData = {
      isVolunteer: true,
      latitude: location.latitude,
      longitude: location.longitude,
    };
    setDocumentNonBlocking(userDocRef, userData, { merge: true });
    toast({
      title: 'Registration Successful!',
      description: "You're now registered as a community volunteer. Thank you!",
    });
    setIsSubmitting(false);
  };
  
  const handleCreateTeam = async () => {
    if (!user || !firestore || !location || !userProfile || !newTeamName || !userDocRef) return;
    setIsSubmitting(true);
    
    if (userProfile.teamId) {
        toast({ variant: 'destructive', title: 'Already in a team', description: 'You must leave your current team before creating a new one.' });
        setIsSubmitting(false);
        return;
    }

    const newTeamData: Omit<Team, 'id'> = {
        name: newTeamName,
        description: newTeamDescription,
        leaderId: user.uid,
        latitude: location.latitude,
        longitude: location.longitude,
        memberIds: [user.uid],
    };
    
    const newTeamRef = await addDocumentNonBlocking(collection(firestore, 'teams'), newTeamData);
    
    if (newTeamRef) {
        setDocumentNonBlocking(userDocRef, { teamId: newTeamRef.id }, { merge: true });
        toast({ title: 'Team Created!', description: `Your new team "${newTeamName}" is ready.` });
    }
    
    setIsSubmitting(false);
    setCreateTeamOpen(false);
    setNewTeamName('');
    setNewTeamDescription('');
  }

  const handleJoinTeam = async (teamId: string) => {
    if (!user || !firestore || !userDocRef || !userProfile) return;
     if (userProfile.teamId) {
        toast({ variant: 'destructive', title: 'Already in a team', description: 'You must leave your current team to join another.' });
        return;
    }
    
    const teamRef = doc(firestore, 'teams', teamId);
    
    const batch = writeBatch(firestore);
    batch.update(teamRef, { memberIds: arrayUnion(user.uid) });
    batch.update(userDocRef, { teamId });
    
    await batch.commit();
    toast({ title: 'Welcome to the team!', description: 'You have successfully joined the team.' });
  }

  const handleLeaveTeam = async () => {
    if (!user || !firestore || !userDocRef || !userTeam) return;
    
    const teamRef = doc(firestore, 'teams', userTeam.id);
    const batch = writeBatch(firestore);

    // Set teamId to null in the user's profile
    batch.update(userDocRef, { teamId: null });

    if (userTeam.memberIds.length <= 1) {
        // If the user is the last member, delete the team document
        batch.delete(teamRef);
    } else {
        // Otherwise, just remove the user from the team's member list
        batch.update(teamRef, { memberIds: arrayRemove(user.uid) });
    }
    
    await batch.commit();
    toast({ title: 'You have left the team.' });
  }


  const volunteersWithDistance: VolunteerWithDistance[] = useMemo(() => {
    if (!volunteers) return [];
    if (!location) return volunteers;
    return volunteers
      .map((v) => ({
        ...v,
        distance:
          v.latitude && v.longitude
            ? calculateDistance(
                location.latitude,
                location.longitude,
                v.latitude,
                v.longitude
              )
            : undefined,
      }))
      .sort((a, b) => {
        if (a.distance === undefined) return 1;
        if (b.distance === undefined) return -1;
        return a.distance - b.distance;
      });
  }, [volunteers, location]);

  const nearbyTeams: TeamWithDistance[] = useMemo(() => {
    if (!allTeams || !location) return [];
    return allTeams.map(team => ({
        ...team,
        distance: calculateDistance(location.latitude, location.longitude, team.latitude, team.longitude)
    }))
    .filter(team => team.distance <= TEAMS_RADIUS_KM && team.id !== userProfile?.teamId)
    .sort((a,b) => a.distance - b.distance);
  }, [allTeams, location, userProfile]);

  const isLoading =
    isUserLoading ||
    isProfileLoading ||
    isLoadingVolunteers ||
    isLoadingTeams ||
    isUserTeamLoading;

  if (!isClient || isLoading) {
    return (
      <div className="container mx-auto max-w-4xl py-10">
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-6 w-96 mb-8" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <div className="mt-8 grid md:grid-cols-2 gap-8">
          <div>
            <Skeleton className="h-8 w-56 mb-4" />
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          </div>
           <div>
            <Skeleton className="h-8 w-56 mb-4" />
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-10">
      <h1 className="text-3xl font-bold font-headline">Volunteer Hub</h1>
      <p className="mt-2 text-muted-foreground">
        Join local heroes, form teams, and make a bigger impact together.
      </p>

      {!userProfile?.isVolunteer ? (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Become a Volunteer</CardTitle>
            <CardDescription>
              Register as a volunteer to join teams and help your community. Your general location will be shared to help coordinate efforts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleRegister}
              disabled={isSubmitting || !location}
            >
              {isSubmitting ? (
                <Loader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <HandHeart className="mr-2 h-4 w-4" />
              )}
              {location
                ? 'Register as a Volunteer'
                : 'Enable location to register'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* My Team Section */}
          <div className="flex flex-col gap-6">
             <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>My Team</CardTitle>
                        {userTeam && (
                            <Button variant="destructive" size="sm" onClick={handleLeaveTeam}>
                                <LogOut className="mr-2 h-4 w-4" /> Leave Team
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {isUserTeamLoading ? <Loader className="animate-spin" /> : userTeam ? (
                        <div>
                            <h3 className="text-lg font-semibold">{userTeam.name}</h3>
                            <p className="text-muted-foreground text-sm mb-4">{userTeam.description}</p>
                            <h4 className="font-semibold mb-2">Members ({teamMembers?.length || 0})</h4>
                            <div className="space-y-2">
                                {isLoadingTeamMembers ? <Loader className="animate-spin" /> : teamMembers?.map(member => (
                                    <div key={member.id} className="flex items-center gap-2 text-sm">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={member.avatarUrl} />
                                            <AvatarFallback>{member.name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span>{member.name} {member.id === userTeam.leaderId && '(Leader)'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <p className="text-muted-foreground mb-4">You are not part of a team yet.</p>
                             <Button onClick={() => setCreateTeamOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Create a Team
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Join Team Section */}
            {!userTeam && (
              <Card>
                <CardHeader>
                  <CardTitle>Join a Nearby Team</CardTitle>
                  <CardDescription>
                    Connect with other volunteers in your area.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {nearbyTeams.length > 0 ? (
                    nearbyTeams.map((team) => (
                      <div key={team.id} className="flex items-center justify-between rounded-md border p-4">
                        <div>
                          <p className="font-semibold">{team.name}</p>
                          <p className="text-sm text-muted-foreground">{team.description}</p>
                           <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                                <MapPin className="h-3 w-3 text-primary"/>
                                <span>{team.distance?.toFixed(1)} km away</span>
                                <Users className="h-3 w-3 text-primary ml-2"/>
                                <span>{team.memberIds.length} members</span>
                           </div>
                        </div>
                        <Button size="sm" onClick={() => handleJoinTeam(team.id)}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Join
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No teams found within a 5km radius. Why not start one?
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
          

          {/* All Volunteers Section */}
          <div>
            <h2 className="text-2xl font-bold font-headline mb-4">
              All Volunteers ({volunteers?.length || 0})
            </h2>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {volunteersWithDistance.map((volunteer) => (
                    <div
                      key={volunteer.id}
                      className="flex items-center gap-4 p-4"
                    >
                      <Avatar>
                        <AvatarImage
                          src={volunteer.avatarUrl}
                          alt={volunteer.name}
                        />
                        <AvatarFallback>
                          {volunteer.name?.charAt(0) || 'V'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold">{volunteer.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {volunteer.email}
                        </p>
                      </div>
                      {volunteer.distance !== undefined && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span>{volunteer.distance.toFixed(1)} km away</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      )}
      
       {/* Create Team Dialog */}
      <Dialog open={isCreateTeamOpen} onOpenChange={setCreateTeamOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Create a New Team</DialogTitle>
                <DialogDescription>
                    Start a new volunteer team to tackle issues in your community.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="team-name">Team Name</Label>
                    <Input id="team-name" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="e.g., The Park Rangers" />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="team-description">Description</Label>
                    <Textarea id="team-description" value={newTeamDescription} onChange={(e) => setNewTeamDescription(e.target.value)} placeholder="What is your team's mission?" />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleCreateTeam} disabled={isSubmitting || !newTeamName}>
                    {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                    Create Team
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
